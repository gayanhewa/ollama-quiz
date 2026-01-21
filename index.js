import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import ollama from 'ollama';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function fetchBlogContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();
    $('.sidebar').remove();
    $('.comments').remove();
    
    const title = $('h1').first().text() || $('title').text() || '';
    
    const contentSelectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '[role="main"]'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }
    
    if (!content) {
      content = $('body').text();
    }
    
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return {
      title: title.trim(),
      content: content.substring(0, 8000)
    };
  } catch (error) {
    throw new Error(`Failed to fetch blog content: ${error.message}`);
  }
}

async function generateQuiz(blogContent, numberOfQuestions = 5) {
  const prompt = `Based on the following blog post content, generate ${numberOfQuestions} multiple-choice quiz questions that test understanding of the key concepts. 

Blog Title: ${blogContent.title}
Blog Content: ${blogContent.content}

Please generate the quiz in JSON format with the following structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is the correct answer"
    }
  ]
}

Make sure the questions are:
- Relevant to the main topics covered in the blog post
- Clear and unambiguous
- Testing comprehension, not just memory
- Varied in difficulty
- Have exactly 4 options each

Return ONLY the JSON, no additional text.`;

  try {
    console.log('Connecting to Ollama...');
    
    // Configure Ollama client with host if provided
    const ollamaConfig = {};
    if (process.env.OLLAMA_HOST) {
      ollamaConfig.host = process.env.OLLAMA_HOST;
    }
    
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || 'llama2',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 2048
      }
    }, ollamaConfig);
    
    console.log('Quiz generated successfully');
    let quizData;
    try {
      quizData = JSON.parse(response.message.content);
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', response.message.content);
      throw new Error('Invalid JSON response from Ollama');
    }
    return quizData;
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Cannot connect to Ollama. Please ensure Ollama is running (run: ollama serve)');
    } else if (error.message.includes('model') && error.message.includes('not found')) {
      throw new Error(`Model not found. Please pull the model first (run: ollama pull ${process.env.OLLAMA_MODEL || 'llama2'})`);
    }
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}

app.post('/generate-quiz', async (req, res) => {
  try {
    const { url, numberOfQuestions = 5 } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Please provide a blog post URL in the request body'
      });
    }
    
    console.log(`Fetching content from: ${url}`);
    const blogContent = await fetchBlogContent(url);
    
    if (!blogContent.content || blogContent.content.length < 100) {
      return res.status(400).json({ 
        error: 'Insufficient content',
        message: 'Could not extract enough content from the provided URL'
      });
    }
    
    console.log(`Generating quiz with ${numberOfQuestions} questions...`);
    const quiz = await generateQuiz(blogContent, numberOfQuestions);
    
    res.json({
      success: true,
      blogTitle: blogContent.title,
      quiz: quiz.questions || quiz,
      metadata: {
        url: url,
        numberOfQuestions: numberOfQuestions,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      message: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Ollama Quiz API is running'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Ollama Quiz Generator API',
    endpoints: {
      'POST /generate-quiz': {
        description: 'Generate a quiz from a blog post URL',
        body: {
          url: 'required - URL of the blog post',
          numberOfQuestions: 'optional - Number of quiz questions (default: 5)'
        }
      },
      'GET /health': 'Check API health status'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Ollama Quiz API running on http://localhost:${PORT}`);
  console.log(`Make sure Ollama is running with a model installed (e.g., llama2)`);
});
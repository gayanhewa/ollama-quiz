# 🚧 Ollama Quiz Generator API [UNDER CONSTRUCTION] 🚧

> ⚠️ **This project is currently under active development and not ready for production use.**

An API that processes blog posts from URLs and generates quizzes using Ollama's language models. Includes Docker packaging with embedded Ollama for easy deployment to Fly.io or any container platform.

## Project Status

- [x] Basic API implementation
- [x] Docker containerization with embedded Ollama
- [x] Local testing with docker-compose
- [ ] Improved quiz generation prompts
- [ ] Support for multiple models
- [ ] Rate limiting and caching
- [ ] Production deployment to Fly.io
- [ ] Comprehensive testing suite
- [ ] API documentation

## Prerequisites

1. **Ollama**: Make sure Ollama is installed and running
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Pull a model (e.g., llama2)
   ollama pull llama2
   
   # Run Ollama
   ollama serve
   ```

2. **Node.js**: Version 18+ recommended

## Installation

```bash
npm install
```

## Usage

1. Start the API server:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. The API will be available at `http://localhost:3000`

## API Endpoints

### Generate Quiz
**POST** `/generate-quiz`

Generate a quiz from a blog post URL.

Request body:
```json
{
  "url": "https://example.com/blog-post",
  "numberOfQuestions": 5
}
```

Response:
```json
{
  "success": true,
  "blogTitle": "Blog Post Title",
  "quiz": [
    {
      "question": "What is...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "This is correct because..."
    }
  ],
  "metadata": {
    "url": "https://example.com/blog-post",
    "numberOfQuestions": 5,
    "generatedAt": "2024-01-21T..."
  }
}
```

### Health Check
**GET** `/health`

Check if the API is running.

### API Info
**GET** `/`

Get information about available endpoints.

## Testing

Run the test script to verify the API is working:
```bash
node test.js
```

## Example Usage with curl

```bash
curl -X POST http://localhost:3000/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://blog.openai.com/chatgpt",
    "numberOfQuestions": 5
  }'
```

## Configuration

- **Port**: Set the `PORT` environment variable (default: 3000)
- **Ollama Model**: Edit `index.js` to change the model (default: llama2)

## How It Works

1. **Content Extraction**: The API fetches the blog post HTML and uses Cheerio to extract the main content, removing navigation, ads, and other non-content elements.

2. **Quiz Generation**: The extracted content is sent to Ollama with a prompt to generate multiple-choice questions testing comprehension of the key concepts.

3. **JSON Response**: The generated quiz is returned in a structured JSON format with questions, options, correct answers, and explanations.

## Docker Deployment

### Local Docker Testing

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. The API will be available at `http://localhost:3000`

### Deploy to Fly.io

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly:
   ```bash
   flyctl auth login
   ```

3. Deploy using the provided script:
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   # Create app
   flyctl launch --name ollama-quiz --region sjc --no-deploy
   
   # Create volume for model storage
   flyctl volumes create ollama_data --size 10 --region sjc
   
   # Deploy
   flyctl deploy --ha=false
   
   # Scale for Ollama requirements
   flyctl scale vm shared-cpu-4x --memory 2048
   ```

4. Your app will be available at `https://ollama-quiz.fly.dev`

### Docker Image Details

The Docker image includes:
- Ubuntu 22.04 base
- Node.js 20
- Ollama pre-installed
- Automatic model pulling on first run
- Persistent volume for model storage

### Resource Requirements

- **Minimum**: 2 CPU cores, 2GB RAM
- **Recommended**: 4 CPU cores, 4GB RAM
- **Storage**: 10GB for Ollama models

## Troubleshooting

- **"Failed to generate quiz"**: Make sure Ollama is running (`ollama serve`)
- **"Model not found"**: Pull the required model (`ollama pull llama2`)
- **Empty content extraction**: Some websites may have JavaScript-rendered content that requires a different extraction approach
- **Docker memory issues**: Increase Docker memory allocation or use a smaller model
- **Fly.io deployment fails**: Ensure you have sufficient account limits and the correct VM size

## Notes

- The API limits blog content to 8000 characters to stay within model context limits
- Questions are generated to test comprehension, not just memorization
- The default model is `llama2`, but you can change it to any Ollama-supported model
- First run may take longer as the model needs to be downloaded (~4GB for llama2)
- Model data persists between container restarts when using volumes
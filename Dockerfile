FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production 2>/dev/null || npm install --production

# Copy app source
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start Ollama in the background\n\
echo "Starting Ollama service..."\n\
ollama serve &\n\
OLLAMA_PID=$!\n\
\n\
# Wait for Ollama to be ready\n\
echo "Waiting for Ollama to be ready..."\n\
sleep 5\n\
\n\
# Pull the model if not already present\n\
echo "Pulling tinyllama model (this may take a few minutes on first run)..."\n\
ollama pull tinyllama || echo "Model pull failed or already exists"\n\
\n\
# Start the Node.js application\n\
echo "Starting Node.js application..."\n\
exec node index.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV OLLAMA_HOST=http://127.0.0.1:11434
ENV OLLAMA_MODEL=llama2

# Run the startup script
CMD ["/app/start.sh"]
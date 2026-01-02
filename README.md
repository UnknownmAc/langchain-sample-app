# LangChain JS Sample App

A sample application demonstrating how to build AI agents using [LangChain JS](https://docs.langchain.com/oss/javascript/langchain/overview).

## Prerequisites

- Node.js 18+ installed
- An API key from either:
  - [Anthropic](https://console.anthropic.com/) for Claude models
  - [OpenAI](https://platform.openai.com/) for GPT models

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

Or export it directly in your terminal:

```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

### 3. Run the application

```bash
npm start
```

## Project Structure

```
langchain-sample-app/
├── index.js          # Main application with agent definition
├── package.json      # Dependencies and scripts
├── .env.example      # Environment variables template
└── README.md         # This file
```

## How It Works

This sample app creates an AI agent with two tools:

1. **get_weather** - Returns weather information for a given city
2. **calculate** - Performs basic mathematical calculations

The agent uses Claude (or GPT-4) to understand user queries and automatically decides which tools to use to answer questions.

## Customization

### Changing the Model

Edit `index.js` and modify the `model` parameter:

```javascript
const agent = createAgent({
  model: "gpt-4o", // Use OpenAI instead
  tools: [getWeather, calculate],
});
```

### Adding Custom Tools

Create new tools using the `tool` function:

```javascript
const myTool = tool(
  ({ param }) => `Result: ${param}`,
  {
    name: "my_tool",
    description: "Description of what the tool does",
    schema: z.object({
      param: z.string().describe("Parameter description"),
    }),
  }
);
```

## Learn More

- [LangChain Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangChain Quickstart](https://docs.langchain.com/oss/javascript/langchain/quickstart)
- [LangChain Tools Guide](https://docs.langchain.com/oss/javascript/langchain/tools)


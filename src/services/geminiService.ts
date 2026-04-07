import { GoogleGenAI, Content } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ResearchStep {
  s_type: 'thinking' | 'planning' | 'execution' | 'refinement' | 'final';
  content: string;
}

export async function* runResearchCycle(query: string, history: Content[] = []) {
  if (!ai) {
    yield { s_type: 'final', content: "Error: Gemini API key not found. Please configure it in the Secrets panel." };
    return;
  }

  const model = "gemini-3.1-pro-preview";

  // Helper to stream a step
  async function* streamStep(type: ResearchStep['s_type'], prompt: string, systemInstruction: string, useTools = false) {
    let fullText = "";
    yield { s_type: type, content: "Initializing..." };

    const result = await ai!.models.generateContentStream({
      model,
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: { 
        systemInstruction,
        tools: useTools ? [{ googleSearch: {} }] : undefined
      }
    });

    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      yield { s_type: type, content: fullText };
    }
    return fullText;
  }

  // 1. THINKING
  const thinkingPrompt = `Analyze this research query: "${query}". What are the core themes, potential challenges, and key areas to investigate? Provide a brief internal analysis.`;
  const thinkingInstruction = "You are the Thinking Module of AI Agent Researcher. Analyze the human input and current conversation context. Be analytical, deep, and transparent about your thought process.";
  let thinkingText = "";
  for await (const step of streamStep('thinking', thinkingPrompt, thinkingInstruction)) {
    yield step;
    thinkingText = step.content;
  }

  // 2. PLANNING
  const planningPrompt = `Based on the query "${query}" and your initial analysis, create a detailed research plan with specific subtasks (Task Decomposition).`;
  const planningInstruction = "You are the Planner Module of AI Agent Researcher. Decompose the task into clear, actionable subtasks. Be structured and methodical.";
  let planningText = "";
  for await (const step of streamStep('planning', planningPrompt, planningInstruction)) {
    yield step;
    planningText = step.content;
  }

  // 3. EXECUTION (Research)
  const executionPrompt = `Perform in-depth research on: "${query}". Execute the plan: ${planningText}. Use your internal knowledge and search tools to gather multi-source data.`;
  const executionInstruction = "You are the Execution Engine of AI Agent Researcher. Perform multi-source research, data gathering, and search. Be thorough and provide evidence-based insights.";
  let executionText = "";
  for await (const step of streamStep('execution', executionPrompt, executionInstruction, true)) {
    yield step;
    executionText = step.content;
  }

  // 4. REFINEMENT
  const refinementPrompt = `Critically evaluate these research findings for the query "${query}":\n\n${executionText}\n\nRun your Reflection Loop: critically evaluate results for accuracy, completeness, bias, and gaps; apply self-improvement.`;
  const refinementInstruction = "You are the Reflection Loop of AI Agent Researcher. Critically evaluate results for accuracy, completeness, bias, and gaps. Apply self-improvement to deliver refined, higher-quality output.";
  let refinementText = "";
  for await (const step of streamStep('refinement', refinementPrompt, refinementInstruction)) {
    yield step;
    refinementText = step.content;
  }

  // 5. FINAL REPORT
  const finalPrompt = `Synthesize a final, polished research report for: "${query}". 
  Include the initial analysis, the plan followed, the key findings, and the refined insights. 
  Acknowledge the user's latest message and highlight the benefits: "This saves you hours of research and reduces human error while enabling smart decision making."`;
  const finalInstruction = "You are AI Agent Researcher. Deliver a warm, professional, and confident final report. Speak directly to the user.";
  let finalText = "";
  for await (const step of streamStep('final', finalPrompt, finalInstruction)) {
    yield step;
    finalText = step.content;
  }

  // Update history for memory system
  history.push({ role: 'user', parts: [{ text: query }] });
  history.push({ role: 'model', parts: [{ text: finalText || "" }] });
}

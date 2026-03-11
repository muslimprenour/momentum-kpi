import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { system, messages } = await request.json();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // Convert to OpenAI format
    const openaiMessages = [
      { role: 'system', content: system },
      ...messages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openaiMessages,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    // Convert OpenAI response to Claude-like format for compatibility
    if (data.choices && data.choices[0]) {
      return NextResponse.json({
        content: [{ 
          type: 'text', 
          text: data.choices[0].message.content 
        }]
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Coach API error' }, { status: 500 });
  }
}

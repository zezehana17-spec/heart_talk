import { NextRequest, NextResponse } from 'next/server';

const OPENAI_URL = 'https://api.openai.com/v1/responses';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured in Vercel.' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
    const targetExpression =
      typeof body?.targetExpression === 'string' ? body.targetExpression.trim() : '';

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is empty.' }, { status: 400 });
    }

    const prompt = `You are Heart English's concise speaking-feedback assistant.
The learner's transcript came from browser speech recognition, so it may contain punctuation errors, repeated fragments, or obvious recognition mistakes.

Rules:
1. Preserve the learner's intended meaning. Do not rewrite the whole speech into advanced English.
2. cleanedTranscript: lightly clean punctuation, sentence boundaries, repeated fragments, and only obvious STT recognition errors. Do not silently fix all grammar here.
3. strengths: give exactly 1 short positive observation in Korean, based on what the learner actually said.
4. corrections: choose at most 2 high-value corrections. For each, include original, better, and one short Korean reason.
5. targetExpressionUsed: judge whether the learner used the target expression or a clear equivalent. If there is no target expression, return null.
6. retrySentence: choose exactly 1 useful sentence for the learner to say again. Prefer one of the corrected sentences; if no correction is needed, choose a strong sentence from the transcript.
7. Keep the feedback brief and encouraging. Never invent content the learner did not say.

Target expression: ${targetExpression || '(none)'}

Raw transcript:
${transcript}`;

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'heart_talk_feedback',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                cleanedTranscript: { type: 'string' },
                strengths: { type: 'string' },
                corrections: {
                  type: 'array',
                  maxItems: 2,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      original: { type: 'string' },
                      better: { type: 'string' },
                      reason: { type: 'string' },
                    },
                    required: ['original', 'better', 'reason'],
                  },
                },
                targetExpressionUsed: {
                  anyOf: [{ type: 'boolean' }, { type: 'null' }],
                },
                retrySentence: { type: 'string' },
              },
              required: [
                'cleanedTranscript',
                'strengths',
                'corrections',
                'targetExpressionUsed',
                'retrySentence',
              ],
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI feedback error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'AI feedback request failed.' },
        { status: response.status },
      );
    }

    const outputText =
      data?.output_text ||
      data?.output
        ?.flatMap((item: any) => item?.content || [])
        ?.find((item: any) => item?.type === 'output_text')?.text;

    if (!outputText) {
      return NextResponse.json({ error: 'AI returned no feedback text.' }, { status: 502 });
    }

    let feedback;
    try {
      feedback = JSON.parse(outputText);
    } catch {
      return NextResponse.json({ error: 'Could not parse AI feedback.' }, { status: 502 });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Heart Talk feedback route error:', error);
    return NextResponse.json({ error: 'Could not generate feedback.' }, { status: 500 });
  }
}

import OpenAI from "openai";
import { EXERCISES, type ExerciseType } from "@shared/schema";

// Reference: javascript_openai blueprint
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function validateExercise(
  exerciseType: ExerciseType,
  base64Image: string
): Promise<{
  isCorrect: boolean;
  feedback: string;
  pointsEarned: number;
  encouragement: string;
}> {
  const exercise = EXERCISES[exerciseType];
  
  if (!exercise) {
    throw new Error("Invalid exercise type");
  }

  const prompt = `You are a fun, encouraging AI coach helping children with brain exercises. 

Analyze this image to see if the child is performing the "${exercise.name}" exercise correctly.

Exercise Description: ${exercise.description}
Instructions: ${exercise.instructions.join(" ")}

Determine:
1. Is the child performing this exercise correctly? (yes/no)
2. Provide specific, child-friendly feedback about their form
3. Give an encouraging message

Respond with JSON in this exact format:
{
  "isCorrect": true or false,
  "feedback": "specific feedback about their form",
  "encouragement": "short encouraging phrase like 'Amazing!', 'Great job!', 'Keep it up!', or 'Try again, you've got this!'"
}

Remember: Always be positive and encouraging, even if they need to adjust their form!`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      isCorrect: result.isCorrect || false,
      feedback: result.feedback || "Keep practicing!",
      pointsEarned: result.isCorrect ? 10 : 0,
      encouragement: result.encouragement || (result.isCorrect ? "Great job!" : "Keep trying!"),
    };
  } catch (error) {
    console.error("Error validating exercise:", error);
    throw new Error("Failed to validate exercise");
  }
}

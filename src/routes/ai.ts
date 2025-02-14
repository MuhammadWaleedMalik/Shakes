import express, { Request, Response } from "express";// Ensure correct import of Data model
import Groq from "groq-sdk";
import { attachUserIfExists } from "../middlewares/auth.js";
import { Data } from "../models/data.js";
import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config()


const app = express.Router();

interface CustomRequest extends Request {
  user?: any;
}

const grok_key=process.env.GROK
// Initialize Groq client
const groq = new Groq({
  apiKey: grok_key // Ensure you have GROQ_API_KEY in your .env file
});






app.post("/getName", attachUserIfExists, async (req: CustomRequest, res: Response) => {
    const { prompt } = req.body;
    const user = req?.user || null; // Ensure `req.user` can be null

    // Validate prompt
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        // Generate AI response using Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `Generate creative Shakespeare Quotes  the following description: ${prompt}`,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";

        // If there's no user, return the response without storing
        if (!user) {
            return res.json({ response: responseText });
        }

        // Check if the user exists in the database
        let userData = await Data.findOne({user:user._id})

        if (!userData) {
            // If user does not exist, create a new one
            userData = new Data({
                _id: new mongoose.Types.ObjectId(),
                user:user._id,
                prompts: []
            });
        }

        // Check if the prompt already exists
        let existingPrompt = userData.prompts.find(p => p.prompt === prompt);

        if (existingPrompt) {
            // Add new answer to existing prompt
            existingPrompt.answers.push({ answer: responseText });
        } else {
            // Add new prompt with the answer
            userData.prompts.push({
                prompt: prompt,
                answers: [{ answer: responseText }]
            });
        }

        // Save the updated user data
        await userData.save();

        res.json({ response: responseText });

    } catch (error) {
        console.error("Groq API Error:", error);
        res.status(500).json({ error: "Failed to generate names. Please try again." });
    }
});




export default app;
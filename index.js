require("dotenv").config();


const express = require("express");
const app = express();
const port = 5000;
const path = require("path");
const axios = require('axios');
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    async function callAI(prompt) {
    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
    });

    return completion.choices[0].message.content;
    }


app.use(express.json());

app.get("/weather", (req, res) =>{
    res.send("Backend is working");
});

app.post("/weather",  async(req, res) => {
    let{city} = req.body;

    if(!city || city.trim() === ""){
        return res.status(400).json({
            error: "City name is required"
        });
    }

    const apiKey = process.env.WEATHER_API_KEY;

    try {
        const weatherUrl =`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const response = await axios.get(weatherUrl);
        const weatherData = response.data;

    const cleanWeatherData = {
        city: weatherData.name,
        temperature: weatherData.main.temp,
        feelsLike: weatherData.main.feels_like,
        humidity: weatherData.main.humidity,
        condition: weatherData.weather[0].description,
        windSpeed: weatherData.wind.speed
    };

    console.log("Weather fetched for:", cleanWeatherData.city);

    // res.json(cleanWeatherData);

    const prompt = `You are a funny but informative weather reporter.
                    Write ONLY 2 short sentences.
                    Each sentence must be under 12 words.
                    Use light, natural humor (not cringe).
                    Do NOT use quotes.
                    Do NOT repeat words.
                    Mention only:
                    - temperature
                    - condition
                    - one practical advice
                    Mode: funny / sarcastic / professional


                    City: ${cleanWeatherData.city}
                    Temperature: ${Math.round(cleanWeatherData.temperature)}°C
                    Feels like: ${cleanWeatherData.feelsLike}°C
                    Humidity: ${cleanWeatherData.humidity}%
                    Condition: ${cleanWeatherData.condition}
                    Wind speed: ${cleanWeatherData.windSpeed} km/h

                    Give a friendly weather report with one practical advice.
                    `;

    let aiSummary = `It's ${cleanWeatherData.temperature}°C in ${cleanWeatherData.city} with ${cleanWeatherData.condition}. 
                        Basically, weather is doing its thing again 😄 Stay prepared!`;

        try {
            aiSummary = await callAI(prompt);

            aiSummary = aiSummary
            .replace(/\n/g, "")
            .split(".")
            .slice(0, 2)
            .join(".")
            .trim() + ".";
        } catch (aiError) {
            console.error("GROQ FALLBACK:", aiError.message);
        }


        return res.json({
            ...cleanWeatherData,
            aiSummary
        });

    
    } catch (error) {

        console.error("AI ERROR:", error);

        // API responded with error
        if (error.response) {
        return res.status(error.response.status).json({
            error: "City not found or invalid API key"
        });

        // No response (network issue)
        } else if (error.request) {
        return res.status(500).json({
            error: "Weather service not responding"
        });

        // Unknown error
        } else {
        return res.status(500).json({
            error: "Something went wrong"
        });
        }
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
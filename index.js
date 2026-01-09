require("dotenv").config();


const express = require("express");
const app = express();
const port = 5000;
const path = require("path");
const axios = require('axios');
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


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

    console.log(weatherData);
    // res.json(cleanWeatherData);

    const prompt = `Explain today's weather in a friendly, simple, and slightly humorous way.
                    city: ${cleanWeatherData.city}
                    temperature: ${cleanWeatherData.temperature}°C
                    feelsLike: ${cleanWeatherData.feelsLike}°C
                    humidity: ${cleanWeatherData.humidity}%
                    condition: ${cleanWeatherData.condition}
                    windSpeed: ${cleanWeatherData.windSpeed}km/h
                    `;

       let aiSummary = "AI summary is temporarily unavailable. Please check again later.";

        try {
            const aiResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            });

            aiSummary = aiResponse.choices[0].message.content;

        } catch (aiError) {
            console.error("AI FALLBACK:", aiError.code || aiError.message);
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
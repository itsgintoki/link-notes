import 'dotenv/config';
import express from 'express';

const app = express();

const PORT = process.env.PORT || 8000; 

app.get('/', (req, res) => {
    console.log("Server is up and running");
    res.send("Server is up and running!"); 
});

app.listen(PORT, () => {
    console.log(`Server is listening on PORT ${PORT}`); 
});

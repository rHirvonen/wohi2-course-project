const express = require('express');
const app = express();

app.use(express.json());

const questionsRouter = require("./routes/questions");


const PORT = process.env.PORT || 3000;


app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
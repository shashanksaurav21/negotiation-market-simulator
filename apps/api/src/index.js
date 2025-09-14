const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const simulationsRouter = require("./routes/simulations");
app.use("/api/simulations", simulationsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));

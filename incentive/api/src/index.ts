import express, { Application } from "express";
import morgan from "morgan";
import Router from "./routes";

const PORT = process.env.PORT || 8080;

const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use(Router);

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});

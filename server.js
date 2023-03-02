require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/userRoute");
const newsRoute = require("./routes/newsRoute");
const contactRoute = require("./routes/contactRoute");
const symptomRoute = require("./routes/symptomRoute");
const sanitize = require("express-mongo-sanitize");
const clean = require("xss-clean");
const expressRateLimit = require("express-rate-limit");
const hpp = require("hpp");
const path = require("path");
const errorHandler = require("./middleware/errorMiddleware");
const helmet = require("helmet");
const jsStringEscape = require("js-string-escape");
var encodeTheJS = jsStringEscape(`Quotes (\", \'`);
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//protects from NoSQL attacks
//app.use(sanitize());
//app.disable("x-powered-by");
//to prevent DNS attacks. Helmet adds some headers to requests
//app.use(helmet());
//prevent XSS attacks
//app.use(clean);

const limited = expressRateLimit({
  windowMs: 10 * 60 * 1000, //10 mins
  max: 1,
});

//app.use(limited);
app.use(hpp());
const html = escape("receving a $pecial $cr1//pt");

//enable cors
app.use(
  cors({
    origin: ["http://localhost:3000", "https://msymptoms-app.onrender.com"],
  })
);

// Routes
app.use("/api/users", userRoute);
app.use("/api/users", newsRoute);
app.use("/api/support", contactRoute);
app.use("/api/symptoms", symptomRoute);

app.get("/", (req, res) => {
  res.send("Home Page");
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
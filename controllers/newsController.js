const asyncHandler = require("express-async-handler");

const axios = require("axios");
const { StatusCodes } = require("http-status-codes");

const getNews = asyncHandler(async (req, res) => {
  try {
    const news = await axios.get(
      `https://newsapi.org/v2/everything?q=multiple-sclerosis&from=${
        Date.now() - 12 * 4 * 7 * 24 * 60 * 60 * 100
      }&sortBy=related&page=2&pageSize=6&apiKey=add74e8d46474a8aa5bf75260f129975`
    );
    res.status(StatusCodes.OK).json(news.data);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

module.exports = {
  getNews,
};

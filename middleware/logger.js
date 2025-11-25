const logger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;

    console.log(`${status} ${method} ${url}`);
  });

  next();
};

export default logger;

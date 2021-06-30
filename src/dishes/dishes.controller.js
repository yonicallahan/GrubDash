const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass
function list(__, res) {
  res.json({ data: dishes });
};
function dishIdExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish does not exist: ${req.params.dishId}`
  });
};
function routeIdMatchesBodyId(req, _, next) {
  const dishId = req.params.dishId;
  const { id } = req.body.data;
  if (!id || id === dishId) return next();
  next({
    status: 400,
    message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
  });
};
function bodyHasData(propName) {
  return (req, _, next) => {
    const { data = {} } = req.body;
    const value = data[propName];
    if (value) return next();
    next({ status: 400, message: `Dish must include a ${propName}` });
  };
};
const hasName = bodyHasData("name");
const hasDescription = bodyHasData("description");
const hasImageUrl = bodyHasData("image_url");

function hasPriceGreaterThanZero(req, _, next) {
  const { data: { price } = {} } = req.body;
  if (Number.isInteger(price) && price > 0) return next();
  next({
    status: 400,
    message: `Dish must have a price that is an integer greater than 0`,
  });
};
function create(req, res) {
  const dish = req.body.data;
  dish.id = nextId();
  dishes.push(dish);
  res.status(201).json({ data: dish });
};
function update(req, res) {
  const { id } = res.locals.dish;
  Object.assign(res.locals.dish, req.body.data, { id });
  res.json({ data: res.locals.dish });
};
function read(_, res) {
  res.json({ data: res.locals.dish });
};
module.exports = {
  list,
  create: [
    hasName,
    hasDescription,
    hasPriceGreaterThanZero,
    hasImageUrl,
    create,
  ],
  update: [
    dishIdExists,
    routeIdMatchesBodyId,
    hasName,
    hasDescription,
    hasPriceGreaterThanZero,
    hasImageUrl,
    update,
  ],
  read: [dishIdExists, read],
};
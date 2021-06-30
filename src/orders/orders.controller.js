const path = require("path");
// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
const validStatuses = ['pending', 'preparing', 'out-for-delivery', 'delivered'];
function bodyHasData(propName) {
  return (req, _, next) => {
    const value = req.body.data[propName];
    if (value)  return next();
    next({ status: 400, message: `Order must include a ${propName}` });
  };
}
const hasDeliverTo = bodyHasData('deliverTo');
const hasMobileNumber = bodyHasData('mobileNumber');
function hasValidStatus(req, _, next) {
  const { data = {} } = req.body;
  const status = data.status;
  if (validStatuses.includes(status)) return next();
  next({
    status: 400,
    message: `Order must have a status of ${validStatuses}`
  });
}
function hasDishes(req, _, next) {
  const { data = {} } = req.body;
  const dishes = data.dishes;
  if (dishes && Array.isArray(dishes) && dishes.length) return next();
  next({ status: 400, message: 'Order must include at least one dish' });
}
function dishesHaveQuantity(req, _, next) {
  const { data = {} } = req.body;
  const message = data.dishes
    .map((dish, index) =>
      dish.quantity && Number.isInteger(dish.quantity)
        ? null
        : `Dish ${index} must have a quantity that is an integer greater than 0`
    )
    .filter((errorMessage) => errorMessage !== null)
    .join(',');
  if (message) return next({ status: 400, message });
  next();
}
function routeIdMatchesBodyId(req, _, next) {
  const dishId = req.params.orderId;
  const { id } = req.body.data;
  if (!id || id === dishId) return next();
  next({
    status: 400,
    message: `Order id does not match route id. Order: ${id}, Route: ${dishId}`
  });
}
function isNotDelivered(_, res, next) {
  if (res.locals.order.status === 'delivered') {
    return next({
      status: 400,
      message: 'A delivered order cannot be changed'
    });
  }
  next();
}
function isPending(_, res, next) {
  if (res.locals.order.status === 'pending') return next();
  return next({
    status: 400,
    message: 'An order cannot be deleted unless it is pending'
  });
}
function orderIdExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${req.params.orderId}`
  });
}
function create(req, res) {
  const order = req.body.data;
  order.id = nextId();
  order.status = 'pending';
  orders.push(order);
  res.status(201).json({ data: order });
}
function destroy(_, res) {
  const index = orders.findIndex((order) => order.id === res.locals.order);
  orders.splice(index, 1);
  res.sendStatus(204);
}
function list(_, res) {
  res.json({ data: orders });
}
function read(_, res) {
  res.json({ data: res.locals.order });
}
function update(req, res) {
  const { id } = res.locals.order;
  Object.assign(res.locals.order, req.body.data, { id });
  res.json({ data: res.locals.order });
}
module.exports = {
  create: [
    hasDeliverTo,
    hasMobileNumber,
    hasDishes,
    dishesHaveQuantity,
    create
  ],
  delete: [orderIdExists, isPending, destroy],
  list,
  read: [orderIdExists, read],
  update: [
    orderIdExists,
    routeIdMatchesBodyId,
    hasValidStatus,
    isNotDelivered,
    hasDeliverTo,
    hasMobileNumber,
    hasDishes,
    dishesHaveQuantity,
    update
  ]
};
"use strict";

const findOrCreateCart = async (prisma, id) => {
  let cart = null;
  if (id) {
    cart = await prisma.cart.findUnique({
      where: {
        id,
      },
    });
  }
  if (!cart) {
    cart = await prisma.cart.create({
      data: {},
    });
  }
  return cart;
};

module.exports = {
  findOrCreateCart,
};

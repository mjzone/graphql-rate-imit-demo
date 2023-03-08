const { GraphQLServer } = require("graphql-yoga");
const { join } = require("path");
const { readFileSync } = require("fs");
const { ObjectId } = require("bson");

// Prisma config
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Rate-limit directive
const { rateLimitDirective } = require("./lib/rate-limiter");

// Utility libs
const { findOrCreateCart } = require("./lib/util");

const typeDefs = readFileSync(join(process.cwd(), "schema.graphql"), {
  encoding: "utf-8",
});

const resolvers = {
  Query: {
    search: async (_, { text }, { prisma }) => {
      let products = await prisma.product.findMany({
        where: {
          name: {
            contains: text,
          },
        },
      });
      return products;
    },
    cart: async (_, { id }, { prisma }) => {
      return findOrCreateCart(prisma, id);
    },
  },
  Cart: {
    items: async ({ id }, _, { prisma }) => {
      let items = await prisma.cart
        .findUnique({
          where: {
            id,
          },
        })
        .items();
      return items;
    },
    totalItems: async ({ id }, _, { prisma }) => {
      let items = await prisma.cart
        .findUnique({
          where: {
            id,
          },
        })
        .items();
      return items.reduce((total, item) => total + item.quantity || 1, 0);
    },
    subTotal: async ({ id }, _, { prisma }) => {
      let items = await prisma.cart
        .findUnique({
          where: {
            id,
          },
        })
        .items();
      const amount = items.reduce((total, item) => total + item.price * item.quantity || 0, 0) ?? 0;
      return amount;
    },
  },
  CartItem: {
    unitPrice: (item) => {
      return item.price;
    },
    total: (item) => {
      return item.quantity * item.price;
    },
  },
  Mutation: {
    addToCart: async (_, { input }, { prisma }) => {
      const cart = await findOrCreateCart(prisma, input.cartId);
      const id = input.id || new ObjectId().toString();
      await prisma.cartItem.upsert({
        create: {
          name: input.name,
          description: input.description,
          price: input.price,
          quantity: input.quantity,
          cartId: cart.id,
        },
        update: {
          quantity: {
            increment: input.quantity,
          },
        },
        where: {
          id,
        },
      });
      return cart;
    },
  },
};

const start = async () => {
  // Connect the prisma client
  await prisma.$connect();

  const server = new GraphQLServer({
    typeDefs,
    resolvers,
    context: { prisma },
    schemaDirectives: {
      rateLimit: rateLimitDirective,
    },
  });

  server.start(() => console.log("Server is running on localhost:4000"));
};

start()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

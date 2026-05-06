const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedPosts = [
  {
    title: "What is Michael Olise number?",
    date: new Date("2026-04-14"),
    content: "17",
    keywords: ["football"],
  },
  {
    title: "Where does Michael Olise play?",
    date: new Date("2026-04-14"),
    content: "FC Bayern Munich",
    keywords: ["football"],
  },
  {
    title: "When did England last win the World Cup?",
    date: new Date("2026-04-14"),
    content: "1966",
    keywords: ["football"],
  },
];

async function main() {
  await prisma.post.deleteMany();
  await prisma.keyword.deleteMany();

  for (const post of seedPosts) {
    await prisma.post.create({
      data: {
        title: post.title,
        date: post.date,
        content: post.content,
        keywords: {
          connectOrCreate: post.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import dotenv from 'dotenv';
dotenv.config({path:"../../.env"});

const { default: app } = await import('./app.js');

const PORT = 7871;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

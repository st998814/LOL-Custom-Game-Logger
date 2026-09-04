import dotenv from 'dotenv';
dotenv.config({path:"../.env"});

const { default: app } = await import('./app.js');

const PORT = 7871;

app.get('/', (req, res) => {
  res.send('Server is up and running successfully!');
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

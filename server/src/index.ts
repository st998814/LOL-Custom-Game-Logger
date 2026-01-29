import 'dotenv/config';
import app from './app.js';

const PORT = 7871;


app.get('/', (req, res) => {
  res.send('Hello World!');
});



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

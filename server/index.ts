import express from 'express';

const app = express();

import 'dotenv/config'

app.use(express.json());

const PORT = 7871 ; 





app.get('/', (req, res) => 

  { res.send('Hello World!'); });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
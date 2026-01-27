import express from 'express';

const app = express();

import fs from 'node:fs'
import sql from './db.js'
import 'dotenv/config'

app.use(express.json());

const PORT = 7871 ; 
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/data',(req,res)=> {

    const data = req.body

  

    const text = JSON.stringify(data , null, 2)
    fs.writeFile('/Users/st998/projects/lol_cusgame_log/server/log01.txt', text, err => {
      if (err) {
      console.error(err);
      } else {
      // file written successfully
      console.log(data)

      }
      });
    res.json({"Recived":data})

});


async function get_name() {
  
  const name = await sql`
    SELECT preferred_name FROM players 
  `;
  console.log(name); 
  return name
}
app.get('/name', async (req, res) => {
  try {
    const rows = await get_name();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
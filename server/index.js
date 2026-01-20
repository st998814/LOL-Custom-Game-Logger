const express = require('express');
const app = express();
const fs = require('node:fs');

app.use(express.json());


PORT = 7871 ; 

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/data',(req,res)=> {

    const data = req.body

    const text = JSON.stringify(data , null, 2)
    fs.writeFile('/Users/st998/projects/lol_cusgame_log/server/log.txt', text, err => {
      if (err) {
      console.error(err);
      } else {
      // file written successfully
      console.log(data)

      }
      });
    res.json({"Recived":data})

});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
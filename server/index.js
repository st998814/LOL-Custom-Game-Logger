const express = require('express');
const app = express();

app.use(express.json());


PORT = 7871 ; 

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/random',(req,res)=> {

    const data = req.body
    console.log(data)

    res.json({"Recived":data})

});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
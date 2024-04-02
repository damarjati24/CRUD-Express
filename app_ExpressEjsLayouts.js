const express = require('express');
const port = 3000;
const app = express();

//Untuk import express-ejs-layouts
const expressLayouts = require('express-ejs-layouts');

//Setup ejs
app.set('view engine', 'ejs');

// app. use untuk Use express-ejs-layouts middleware
// app.set untuk set layouts untuk semua routing
app.use(expressLayouts); 
app.set('layout', 'layout/layouts.ejs')

// Routes
app.get('/', (req, res) => {
    res.render('index', {nama : 'DJP', title:'Home Page'});
});

//Routes
app.get('/about', (req, res,) => {
    res.render('about', {title:'About Page'});
});

//Routes
app.get('/contact', (req, res) => {
    let contact = [
        {nama : 'Damarjati', PhoneNumber : '082122852024'},
        {nama : 'Damarjp', PhoneNumber: '081285101198'},
        {nama : 'Damar', PhoneNumber: '081322484476'},
    ]
    res.render('contact', {contact, title:'Contact Page'});
});

app.get('/product/:id', (req, res) => {
    res.send(`product id : ${req.params.id} <br> category id : ${req.query.idCat}`)
});

app.use('/', (req, res) => {
    res.status(404);
    res.send('PAGE NOT FOUND: 404')
});

//Start server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});






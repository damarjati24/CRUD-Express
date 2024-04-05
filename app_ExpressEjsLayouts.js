const express = require('express');
const port = 3000;
const app = express();
const morgan = require('morgan');
const fs = require('fs');
const dataPath = 'data/contacts.json';
const validator = require('validator');


// Diperlukan untuk meng-handle POST requests
const bodyParser = require('body-parser'); 

const expressLayouts = require('express-ejs-layouts');

app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(express.static('images'));
app.use(expressLayouts);


// Middleware untuk parse application
app.use(bodyParser.urlencoded({ extended: true })); 
app.set('layout', 'layout/layouts.ejs');


// Read (menampilkan semua data contact dari contacts.json)
app.get('/contact', (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const contact = JSON.parse(data);
        res.render('contact', { contact, title: 'Contact Page' });
    });
});


// Route lainnya untuk menampilkan home dan about
app.get('/', (req, res) => {
    res.render('index', { nama: 'DJP', title: 'Home Page' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Page' });
});


// Route untuk menampilkan detail contact berdasarkan nama
app.get('/contact/:name', (req, res) => {
    const contactName = req.params.name;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const contacts = JSON.parse(data);

        // Cari contact berdasarkan nama
        const contact = contacts.find(contact => contact.name === contactName);

        if (!contact) {
            return res.status(404).send('Contact not found');
        }

        res.render('contact_detail', { contact, title: 'Contact Detail' });
    });
});


// Route untuk menampilkan form
app.post('/form', (req, res) => {
    const data = {
        name: '',
        number: '',
        email: ''
    }
    res.render('form.ejs', { title: 'Add New Contact', data});
});


// Route untuk menangani form submission dan validasi
app.post('/add', (req, res) => {
    const newContact = {
        name: req.body.name,
        number: req.body.number,
        email: req.body.email
    };

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const contacts = JSON.parse(data);

        // Ubah nama baru menjadi lowercase untuk validasi
        const newNameLowercase = newContact.name.toLowerCase();

        // Validasi apakah nama sudah ada dalam format lowercase
        const existingName = contacts.find(contact => contact.name.toLowerCase() === newNameLowercase);
        if (existingName) {
            return res.status(400).send('Name already exists. Please use a different name.');
        }

        // Validasi nomor telepon format Indonesia
        if (!validator.isMobilePhone(newContact.number, 'id-ID')) {
            return res.status(400).send('Invalid Indonesian phone number format. Please use the correct format.');
        }

        // Validasi email
        if (newContact.email && !validator.isEmail(newContact.email)) {
            return res.status(400).send('Invalid email format. Please use a valid email address.');
        }

        // Jika semua validasi sukses, tambahkan contact
        contacts.push(newContact);

        fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('New contact added:', newContact);
            res.redirect('/contact');
        });
    });
});


// Route untuk menampilkan form edit berdasarkan nama contact
app.get('/contact/:name/edit', (req, res) => {
    const contactName = req.params.name;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const contacts = JSON.parse(data);

        // Cari contact berdasarkan nama
        const contact = contacts.find(contact => contact.name === contactName);

        if (!contact) {
            return res.status(404).send('Contact not found');
        }

        res.render('edit_contact', { contact, title: 'Edit Contact' });
    });
});


// Route untuk menangani form submission edit
app.post('/contact/:name/edit', (req, res) => {
    const editedContact = {
        name: req.body.name,
        number: req.body.number,
        email: req.body.email
    };

    const contactName = req.params.name;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        let contacts = JSON.parse(data);

        // Cari contact berdasarkan nama
        const contactIndex = contacts.findIndex(contact => contact.name === contactName);

        if (contactIndex === -1) {
            return res.status(404).send('Contact not found');
        }

        // Validasi apakah nama sudah ada dalam format lowercase selain contact yang akan diedit
        const newNameLowercase = editedContact.name.toLowerCase();
        const existingName = contacts.find((contact, index) => {
            return index !== contactIndex && contact.name.toLowerCase() === newNameLowercase;
        });

        if (existingName) {
            return res.status(400).send('Name already exists. Please use a different name.');
        }

        // Validasi nomor telepon format Indonesia
        if (!validator.isMobilePhone(editedContact.number, 'id-ID')) {
            return res.status(400).send('Invalid Indonesian phone number format. Please use the correct format.');
        }

        // Validasi email
        if (editedContact.email && !validator.isEmail(editedContact.email)) {
            return res.status(400).send('Invalid email format. Please use a valid email address.');
        }

        // Update contact dengan data baru
        contacts[contactIndex] = editedContact;

        fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log(`Contact ${contactName} has been updated.`);
            res.redirect('/contact');
        });
    });
});


// Route untuk menghapus contact berdasarkan nama
app.post('/contacts/delete', (req, res) => {
    const contactName = req.body.name;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        let contacts = JSON.parse(data);

        // Filter contacts untuk mendapatkan contact yang bukan dengan name yang dihapus
        contacts = contacts.filter(contact => contact.name !== contactName);

        fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log(`Contact with name ${contactName} has been deleted.`);
            res.redirect('/contact');
        });
    });
});


app.use('/', (req, res) => {
    res.status(404).send('PAGE NOT FOUND: 404');
});


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

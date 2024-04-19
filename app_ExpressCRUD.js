// require untuk import dari module
// app untuk membuat server
// morgan untuk logging dari requesr user
// port untuk server web app
const express = require('express');
const port = 3000;
const app = express();
const morgan = require('morgan');
const validator = require('validator');
const { Pool } = require('pg');


// Diperlukan untuk meng-handle POST requests
const bodyParser = require('body-parser');

// Untuk membuat satu layout tanpa dipisah
const expressLayouts = require('express-ejs-layouts');

// view engine pada browser menggunakan ejs
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(express.static('images'));
app.use(expressLayouts);

// Middleware untuk parse application
app.use(bodyParser.urlencoded({ extended: true }));
app.set('layout', 'layout/layouts.ejs');

// Buat objek konfigurasi untuk koneksi
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'contact db',
    password: '123',
    port: 5432, // Port default PostgreSQL
  });

// Fungsi bantu untuk meng-handle query database secara asinkronus
const queryDB = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Fungsi ini bertujuan untuk memvalidasi apakah suatu nama sudah ada dalam database menggunakan .toLowerCase
const validateName = async (name) => {
  const result = await queryDB('SELECT name FROM contact');
  const existingNames = result.rows.map(row => row.name.toLowerCase());
  return existingNames.includes(name.toLowerCase());
};

// Fungsi ini untuk memvalidasi semua input name, mobile, dan email
const validateInput = async (newContact) => {
  const errorMessage = []
  const isNameExists = await validateName(newContact.name);

  if (isNameExists) {
    errorMessage.push('Name already exists. Please use a different name.');
  }

  if (!validator.isMobilePhone(newContact.mobile, 'id-ID')) {
    errorMessage.push('Invalid Indonesian phone number format. Please use the correct format.');
  }

  if (newContact.email && !validator.isEmail(newContact.email)) {
    errorMessage.push('Invalid email format. Please use a valid email address.');
  } 
    return errorMessage
}


// Read (menampilkan semua data contact dari database)
app.get('/contact', async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM contact');
    const contact = result.rows;
    res.render('contact', { contact, title: 'Contact Page'});
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Route untuk menampilkan home 
app.get('/', (req, res) => {
  res.render('index', { nama: 'Damar', title: 'Home Page' });
});

// Route untuk menampilkan about
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Page' });
});

// Route untuk menampilkan detail contact berdasarkan nama
app.get('/contact/:name', async (req, res) => {
  const contactName = req.params.name;
  try {
    const result = await queryDB('SELECT * FROM contact WHERE name = $1', [contactName]);
    const contact = result.rows[0];

    if (!contact) {
      return res.status(404).send('Contact not found');
    }

    res.render('contact_detail', { contact, title: 'Contact Detail' });
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Internal Server Error');
  }
});


// Route untuk menampilkan form
app.post('/form', (req, res) => {
    console.log(req.body);
    const data = {
      name: req.body.name,  
      mobile: req.body.mobile,
      email: req.body.email
    }
    res.render('form.ejs', { title: 'Add New Contact', data, errorMessage:[]});
  });
  


  // Route untuk menangani form add
app.post('/add', async (req, res) => {
  const newContact = {
    name: req.body.name,
    mobile: req.body.mobile,
    email: req.body.email
  };

  // Memanggil fungsi validateInput untuk validasi secara asinkronus
  try {
    const errorMessage = await validateInput(newContact);
    // Jika semua input valid, contact bisa ditambahkan
    if(errorMessage.length == 0) {
      await queryDB('INSERT INTO contact (name, mobile, email) VALUES ($1, $2, $3)',
      [newContact.name, newContact.mobile, newContact.email]);

    console.log('New contact added:', newContact);
    res.redirect('/contact');
    } 
    // Jika tidak tidak valid memproses error handling
    console.log(errorMessage);
    const result = await queryDB('SELECT * FROM contact');
    const contact = result.rows;

    const data = {
      name: req.body.name,  
      mobile: req.body.mobile,
      email: req.body.email
    }
    res.render('form.ejs', { title: 'Add New Contact', data, errorMessage});
    // Jika system crash 
    } catch (err) {
      console.error('Error executing query', err.stack);
      res.status(500).send('Internal Server Error');
  }
});

// Route untuk menampilkan form edit berdasarkan nama contact
app.get('/contact/:name/edit', async (req, res) => {
  const contactName = req.params.name;

  try {
    const result = await queryDB('SELECT * FROM contact WHERE name = $1', [contactName]);
    const contact = result.rows[0];

    if (!contact) {
      return res.status(404).send('Contact not found');
    }

    res.render('edit_contact', { contact, title: 'Edit Contact', errorMessage:[]});
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Route untuk menangani form submission edit
app.post('/contact/:name/edit', async (req, res) => {
  const editedContact = {
    name: req.body.name,
    mobile: req.body.mobile,
    email: req.body.email
  };

  const contactName = req.params.name;

  // Jika semua input valid, contact bisa di edit
  try {
    const errorMessage = await validateInput(editedContact);
    
    if(errorMessage.length == 0) {
      await queryDB('UPDATE contact SET name = $1, mobile = $2, email = $3 WHERE name = $4',
      [editedContact.name, editedContact.mobile, editedContact.email, contactName]);

    console.log('New contact added:', editedContact);
    res.redirect('/contact');
    } 
    // Jika tidak tidak valid memproses error handling
    console.log(errorMessage);
    const result = await queryDB('SELECT * FROM contact');
    const contact = result.rows;

    const data = {
      name: req.body.name,  
      mobile: req.body.mobile,
      email: req.body.email
    }
    res.render('edit_contact.ejs', { title: 'Add New Contact', contact: editedContact, data, errorMessage});
    // Jika system crash
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Route untuk menghapus contact berdasarkan nama
app.post('/contact/delete', async (req, res) => {
  const contactName = req.body.name;

  try {
    await queryDB('DELETE FROM contact WHERE name = $1', [contactName]);
    console.log(`Contact with name ${contactName} has been deleted.`);
    res.redirect('/contact');
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.use('/', (req, res) => {
  res.status(404).send('PAGE NOT FOUND: 404');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});






// const express = require('express');
// const port = 3000;
// const app = express();
// const morgan = require('morgan');
// const fs = require('fs');
// const dataPath = 'data/contacts.json';
// const validator = require('validator');


// // Diperlukan untuk meng-handle POST requests
// const bodyParser = require('body-parser'); 

// const expressLayouts = require('express-ejs-layouts');

// app.set('view engine', 'ejs');
// app.use(morgan('dev'));
// app.use(express.static('images'));
// app.use(expressLayouts);


// // Middleware untuk parse application
// app.use(bodyParser.urlencoded({ extended: true })); 
// app.set('layout', 'layout/layouts.ejs');


// // Read (menampilkan semua data contact dari contacts.json)
// app.get('/contact', (req, res) => {
//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         const contact = JSON.parse(data);
//         res.render('contact', { contact, title: 'Contact Page' });
//     });
// });


// // Route lainnya untuk menampilkan home dan about
// app.get('/', (req, res) => {
//     res.render('index', { nama: 'Damar', title: 'Home Page' });
// });

// app.get('/about', (req, res) => {
//     res.render('about', { title: 'About Page' });
// });


// // Route untuk menampilkan detail contact berdasarkan nama
// app.get('/contact/:name', (req, res) => {
//     const contactName = req.params.name;

//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         const contacts = JSON.parse(data);

//         // Cari contact berdasarkan nama
//         const contact = contacts.find(contact => contact.name === contactName);

//         if (!contact) {
//             return res.status(404).send('Contact not found');
//         }

//         res.render('contact_detail', { contact, title: 'Contact Detail' });
//     });
// });


// // Route untuk menampilkan form
// app.post('/form', (req, res) => {
//     const data = {
//         name: '',
//         number: '',
//         email: ''
//     }
//     res.render('form.ejs', { title: 'Add New Contact', data});
// });


// // Route untuk menangani form submission dan validasi
// app.post('/add', (req, res) => {
//     const newContact = {
//         name: req.body.name,
//         number: req.body.number,
//         email: req.body.email
//     };

//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         const contacts = JSON.parse(data);

//         // Ubah nama baru menjadi lowercase untuk validasi
//         const newNameLowercase = newContact.name.toLowerCase();

//         // Validasi apakah nama sudah ada dalam format lowercase
//         const existingName = contacts.find(contact => contact.name.toLowerCase() === newNameLowercase);
//         if (existingName) {
//             return res.status(400).send('Name already exists. Please use a different name.');
//         }

//         // Validasi nomor telepon format Indonesia
//         if (!validator.isMobilePhone(newContact.number, 'id-ID')) {
//             return res.status(400).send('Invalid Indonesian phone number format. Please use the correct format.');
//         }

//         // Validasi email
//         if (newContact.email && !validator.isEmail(newContact.email)) {
//             return res.status(400).send('Invalid email format. Please use a valid email address.');
//         }

//         // Jika semua validasi sukses, tambahkan contact
//         contacts.push(newContact);

//         fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
//             if (err) {
//                 console.error(err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }
//             console.log('New contact added:', newContact);
//             res.redirect('/contact');
//         });
//     });
// });


// // Route untuk menampilkan form edit berdasarkan nama contact
// app.get('/contact/:name/edit', (req, res) => {
//     const contactName = req.params.name;

//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         const contacts = JSON.parse(data);

//         // Cari contact berdasarkan nama
//         const contact = contacts.find(contact => contact.name === contactName);

//         if (!contact) {
//             return res.status(404).send('Contact not found');
//         }

//         res.render('edit_contact', { contact, title: 'Edit Contact' });
//     });
// });


// // Route untuk menangani form submission edit
// app.post('/contact/:name/edit', (req, res) => {
//     const editedContact = {
//         name: req.body.name,
//         number: req.body.number,
//         email: req.body.email
//     };

//     const contactName = req.params.name;

//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         let contacts = JSON.parse(data);

//         // Cari contact berdasarkan nama
//         const contactIndex = contacts.findIndex(contact => contact.name === contactName);

//         if (contactIndex === -1) {
//             return res.status(404).send('Contact not found');
//         }

//         // Validasi apakah nama sudah ada dalam format lowercase selain contact yang akan diedit
//         const newNameLowercase = editedContact.name.toLowerCase();
//         const existingName = contacts.find((contact, index) => {
//             return index !== contactIndex && contact.name.toLowerCase() === newNameLowercase;
//         });

//         if (existingName) {
//             return res.status(400).send('Name already exists. Please use a different name.');
//         }

//         // Validasi nomor telepon format Indonesia
//         if (!validator.isMobilePhone(editedContact.number, 'id-ID')) {
//             return res.status(400).send('Invalid Indonesian phone number format. Please use the correct format.');
//         }

//         // Validasi email
//         if (editedContact.email && !validator.isEmail(editedContact.email)) {
//             return res.status(400).send('Invalid email format. Please use a valid email address.');
//         }

//         // Update contact dengan data baru
//         contacts[contactIndex] = editedContact;

//         fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
//             if (err) {
//                 console.error(err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }
//             console.log(`Contact ${contactName} has been updated.`);
//             res.redirect('/contact');
//         });
//     });
// });


// // Route untuk menghapus contact berdasarkan nama
// app.post('/contacts/delete', (req, res) => {
//     const contactName = req.body.name;

//     fs.readFile(dataPath, 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         let contacts = JSON.parse(data);

//         // Filter contacts untuk mendapatkan contact yang bukan dengan name yang dihapus
//         contacts = contacts.filter(contact => contact.name !== contactName);

//         fs.writeFile(dataPath, JSON.stringify(contacts, null, 2), (err) => {
//             if (err) {
//                 console.error(err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }
//             console.log(`Contact with name ${contactName} has been deleted.`);
//             res.redirect('/contact');
//         });
//     });
// });


// app.use('/', (req, res) => {
//     res.status(404).send('PAGE NOT FOUND: 404');
// });


// app.listen(port, () => {
//     console.log(`Server is listening on port ${port}`);
// });





// const express = require('express')
// const app = express()
// const pool = require ("./db.js")
// const port = 3000

// app.use (express.json())

// app.get("/addasync", async (req,res) => {
//     try {
//         const name = "jp"
//         const mobile = "082122852024"
//         const email = "damarjati@gmail.com"
//         const newCont = await pool.query(`INSERT INTO contact values ('${name}', '${email}','${mobile}') RETURNING *`)
//     res.json(newCont)
//     } catch (err) {
//         console.error(err.message)
//     }
// })

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
// })
const route = require('express').Router();
const models = require('../models');
const { upload, cloudinary } = require("../utils/pdfs");
const trieFunctions = require('../utils/trieFunctions');
const Trie = require('../utils/Trie');

const getWords = (filePath) => {
    console.log('yaha aa rha h')
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const pyProg = spawn('python', ['public_static/python/getWords.py', filePath]);  
    
        pyProg.stdout.on('data', (data) => {
            data = data.toString();
            data = data.split('\n');
            data = data[0];
            data = data.split('\', \'');
            data[0] = data[0].substr(2);
            data[data.length-1] = data[data.length-1].substr(0,data[data.length-1].length-3);
            console.log(data);
            resolve(data);
        });
    
        pyProg.stderr.on('data', (err) => {
            console.log(`python ka error: ${err}`)
            reject(err);
        })
    });
}

const constructTrie = (filePath) => {
    filePath = 'public_static/uploads/' + filePath + '.pdf';
    console.log(filePath)
    return new Promise((resolve, reject) => {
        getWords(filePath)
        .then(data => {
            myTrie = new Trie();
            console.log('words')
            data.forEach(word => {
                console.log(word)
                trieFunctions.add(myTrie.root, word);
                console.log(trieFunctions.isWord(myTrie.root, word))
            });
            console.log("Returning Trie");
            console.log(myTrie);
            resolve(myTrie);
        })
        .catch(err => {
            console.log("Error aagya");
            console.log(err)
            reject(err);
        })
    })
};

const uploadPdfAndProcessPdf = function (req) {
    return new Promise((resolve, reject) => {
        if(req.file) {
            cloudinary.uploader.upload(req.file.path) 
            .then(result => {
                console.log(result);
                constructTrie(result.original_filename)
                .then(mtrie => {
                    console.log("Trie mil gya");
                    console.log(mtrie);
                    return models.Pdf.create({
                        name: req.body.name,
                        dateUploaded: Date.now(),
                        uploadedBy: req.user._id,
                        pdfUrl: result.url,
                        trie: mtrie
                    });
                })
            })
            .then(pdf => {
                console.log("Pdff");
                console.log(pdf);
                resolve(pdf);
            })
            .catch(err => {
                console.log("Error aagya");
                reject(err);
            })
        }
        else {
            reject(new Error('No files selected'));
        }
    })
} 

route.post('/', upload.single('pdf'), (req, res) => {
    uploadPdfAndProcessPdf(req) 
    .then(pdf => {
        console.log("Yaha");
        console.log(pdf);
        console.log("Vaha");
        res.redirect('/success');
    })
    .catch(err => {
        console.log(err);
        res.redirect('/failure');
    })
})

route.get('/', (req, res) => {
    res.render('upload');
})

module.exports = route;
const fs = require('fs');

// Removes closing ]
const open = (filename) => {
  const json = fs.readFileSync(filename, 'UTF8');

  const modifiedJson = json.substring(0, json.length - 2);

  fs.writeFileSync(filename, modifiedJson);
};

// Append object to list
const append = (filename, object, isFirstPost) => {
  const json = JSON.stringify(object);

  if (isFirstPost) {
    fs.appendFileSync(filename, `${json}`);
  } else {
    fs.appendFileSync(filename, `,${json}`);
  }
};

// Append closing ]
const close = (filename) => {
  fs.appendFileSync(filename, ']\n');
};

const jsonAppendToListService = {
  open,
  append,
  close,
};

module.exports = jsonAppendToListService;

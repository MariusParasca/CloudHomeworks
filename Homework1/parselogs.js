const fs = require('fs');

var obj = JSON.parse(fs.readFileSync('logs/log02-28-2019.json', 'utf8'));
lineChart("&&");


function lineChart(apiname) {
    var array = [];

    obj.forEach(element => {
        if (element['req'].url.includes(apiname))
            array.push(+element['latency'].split(" ")[0])
    });

    var index = 0;
    var array2 = [];
    for (let element of array) {
        if (index % 25 == 0 || index == 0) {
            array2.push(element);
        }
        index++;
    }
    array2.push(array.pop());
    printAsArray(array2);
}


function printAsArray(array) {
    process.stdout.write("[");
    for (let element of array) {
        process.stdout.write(`${element}, `);
    }
    process.stdout.write("]");
}


function barChart(apiname) {
    array = [0, 0, 0, 0, 0];
    obj.forEach(element => {
        if (element['req'].url.includes(apiname)) {
            var value = +element['latency'].split(" ")[0]
            if (value >= 0 && value <= 10000)
                array[0]++;
            else if (value > 10000 && value <= 15000)
                array[1]++;
            else if (value > 15000 && value <= 20000)
                array[2]++;
            else if (value > 20000 && value <= 25000)
                array[3]++;
            else if (value > 25000 && value <= 30000)
                array[4]++;
        }      
    });
    printAsArray(array)
}








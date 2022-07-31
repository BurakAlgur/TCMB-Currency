import axios from "axios";
import * as convert from "xml-js";
import sql from "mssql";
import config from "./config.json";



function getDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  const second = d.getSeconds().toString().padStart(2, "0");
  const date = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  return date;
}

axios
  .get("https://www.tcmb.gov.tr/kurlar/today.xml")
  .then(function (response) {
    let json = convert.xml2json(response.data, { compact: true, spaces: 4 });
    json = JSON.parse(json);
    const currency = json["Tarih_Date"]["Currency"];
    let crossRateOther;
    let sqlArr = [];

    currency.forEach((c) => {
      if (c["Isim"]["_text"] === "EURO") {
        const updateDate = getDate();
        const forexBuying = c["ForexBuying"]["_text"];
        const forexSelling = c["ForexSelling"]["_text"];
        const banknoteBuying = c["BanknoteBuying"]["_text"];
        const banknoteSelling = c["BanknoteSelling"]["_text"];
        crossRateOther = c["CrossRateOther"]["_text"];
        const sqlTRY = `UPDATE Currency SET Rate=${forexSelling}, UpdatedOnUtc='${updateDate}' WHERE Id=1`;
        const sqlEUR = `UPDATE Currency SET UpdatedOnUtc='${updateDate}', ForexBuying=${forexBuying}, ForexSelling=${forexSelling}, BanknoteBuying=${banknoteBuying}, BanknoteSelling=${banknoteSelling} WHERE Id=3`;
        sqlArr.push(sqlTRY);
        sqlArr.push(sqlEUR);
      }
    });
    currency.forEach((c) => {
      if (c["Isim"]["_text"] === "ABD DOLARI") {
        const updateDate = getDate();
        const forexBuying = c["ForexBuying"]["_text"];
        const forexSelling = c["ForexSelling"]["_text"];
        const banknoteBuying = c["BanknoteBuying"]["_text"];
        const banknoteSelling = c["BanknoteSelling"]["_text"];
        const sqlUSD = `UPDATE Currency SET Rate=${crossRateOther},  UpdatedOnUtc='${updateDate}', ForexBuying=${forexBuying}, ForexSelling=${forexSelling}, BanknoteBuying=${banknoteBuying}, BanknoteSelling=${banknoteSelling} WHERE Id=2`;
        sqlArr.push(sqlUSD);
      }
    });
    return sqlArr;
  })
  .then(function (sqlArr) {
    try {
      sql
        .connect(config)
        .then(async function (_result) {
          const sqlTRY = sqlArr[0];
          const sqlUSD = sqlArr[2];
          const sqlEUR = sqlArr[1];
          const resultTRY = await sql.query(sqlTRY);
          const resultUSD = await sql.query(sqlUSD);
          const resultEUR = await sql.query(sqlEUR);
        })
        .catch(function (error) {
          console.dir(error);
        });
    } catch (error) {
      console.dir(error);
    }
  });
const apiKey = "c34TGR04Xoh2nfNXWx9KjcHWJuOzwQ4G";
async function test() {
  const inc = await fetch(`https://financialmodelingprep.com/api/v3/income-statement/AAPL?limit=2&apikey=${apiKey}`).then(r=>r.json());
  console.log("Income:", inc);
}
test();

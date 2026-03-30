const key0 = "c34TGR04Xoh2nfNXWx9KjcHWJuOzwQ4G";
const keyO = "c34TGRO4Xoh2nfNXWx9KjcHWJuOzwQ4G";

async function test(key, label) {
  console.log(`Testing ${label}...`);
  const iUrl = `https://financialmodelingprep.com/api/v4/income-statement/AAPL?limit=1&apikey=${key}`;
  const inc = await fetch(iUrl).then(r=>r.json());
  if (inc['Error Message']) {
    console.log(`[${label}] Failed:`, inc['Error Message']);
  } else if (!Array.isArray(inc)) {
    console.log(`[${label}] Failed Unknown:`, inc);
  } else {
    console.log(`[${label}] Success. Income:`, inc.length > 0 ? inc[0].revenue : 'Empty');
  }
}
test(keyO, 'V4 test');

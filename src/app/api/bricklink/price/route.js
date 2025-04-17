// src/app/api/bricklink/price/route.js

export async function GET(req, res) {
  try {
    const itemName = new URL(req.url).searchParams.get("itemName");

    console.log(itemName);

    if (!itemName) {
      return Response.json({ error: "Item name is required" }, { status: 400 });
    }

    const url = `https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=${encodeURIComponent(
      itemName
    )}&st=0&cond=&type=&cat=&yf=0&yt=0&loc=&reg=0&ca=0&ss=&pmt=&nmp=0&color=-1&min=0&max=0&minqty=0&nosuperlot=1&incomplete=0&showempty=1&rpp=25&pi=1&ci=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.log("Fetch NOT OK!");
      return Response.json(
        { error: "Failed to fetch BrickLink Data" },
        { status: res.status }
      );
    }
    const data = await res.json();
    const bricklinkData = data.result.typeList[0].items[0];

    if (!bricklinkData) {
      console.log("No BrickLink data found");
      return Response.json({ error: "No data found" }, { status: 404 });
    }

    function stripCurrency(string) {
      const clean = string.replace(/[^0-9.-]+/g, "");
      return parseFloat(clean);
    }

    function averageOfMinMax(min, max) {
      const minPrice = stripCurrency(min);
      const maxPrice = stripCurrency(max);
      return (minPrice + maxPrice) / 2;
    }

    const avgPriceNew = averageOfMinMax(
      bricklinkData.mNewMinPrice,
      bricklinkData.mNewMaxPrice
    );

    const avgPriceUsed = averageOfMinMax(
      bricklinkData.mUsedMinPrice,
      bricklinkData.mUsedMaxPrice
    );

    const result = {
      currency: "USD",
      minPriceNew: stripCurrency(bricklinkData.mNewMinPrice),
      maxPriceNew: stripCurrency(bricklinkData.mNewMaxPrice),
      avgPriceNew,
      minPriceUsed: stripCurrency(bricklinkData.mUsedMinPrice),
      maxPriceUsed: stripCurrency(bricklinkData.mUsedMaxPrice),
      avgPriceUsed,
    };

    return Response.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching BrickLink minifig ID:", error);
    return null;
  }
}

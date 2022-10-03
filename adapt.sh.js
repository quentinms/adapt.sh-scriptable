// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: bolt;

const API_TOKEN = '' // TODO: set your API key
const LOCATION = '' || 'fr' // Set your location
const LOCALE = '' || Device.locale() // Set your locale here

async function getForecastFromAPI (location) {
  const req = new Request(`https://www.adapt.sh/api/v2/forecasts?location=${LOCATION}`)

  req.headers = {
    'X-AUTH-TOKEN': API_TOKEN
  }

  const body = await req.loadJSON()

  return body
}

const levelLabel = {
  1: {
    symbol: '1.circle',
    tint: 'ea4522',
    text: 'Très peu carbonée'
  },
  2: {
    symbol: '2.circle',
    tint: '34BC6E',
    text: 'Peu carbonée'
  },
  3: {
    symbol: '3.circle',
    tint: 'FFCE00',
    text: 'Modérement carbonée'
  },
  4: {
    symbol: '4.circle',
    tint: 'EA4522',
    text: 'Très carbonée'
  },
  5: {
    symbol: '5.circle',
    tint: 'FC9E9E',
    text: 'Extrêmement carbonée'
  }
}

function handleAPIResponse (apiResponse) {
  const forecast = {
    soon: [],
    nextLow: {}
  }

  forecast.soon = apiResponse.forecasts.slice(0, 6)
  forecast.soon.forEach(f => f.start = new Date(f.start))

  forecast.nextLow = apiResponse.forecasts.find(f => f.levelScore <= 2)

  if (forecast.nextLow) {
    forecast.nextLow.start = new Date(forecast.nextLow.start)
  }

  return forecast
}

function createWidget (forecast) {
  const widget = new ListWidget()

  const global = widget.addStack()
  global.layoutVertically()

  // Top Row
  const topRow = global.addStack()
  topRow.layoutHorizontally()

  // Current Forecast
  const current = topRow.addStack()
  current.layoutVertically()

  const now = forecast.soon[0]
  const label = levelLabel[now.levelScore]

  const labeltxt = current.addText(`${label.text}`)
  labeltxt.font = Font.body()

  const symbol = createSymbol(label, 64)
  const imgStack = current.addStack()
  //   imgStack.addSpacer()
  const currentImg = imgStack.addImage(symbol)
  currentImg.tintColor = new Color(label.tint)
  //   imgStack.addSpacer()

  topRow.addSpacer()

  // Next Low-Intensity Forecast
  const low = topRow.addStack()
  low.layoutVertically()

  const lowHeader = low.addStack()
  const txt = lowHeader.addText('Prochain ')

  if (!forecast.nextLow) {
    const cleanStack = low.addStack()
    cleanStack.addText('🤷')
  } else {
    const img = lowHeader.addImage(createSymbol(levelLabel[forecast.nextLow.levelScore], 20))

    img.imageSize = new Size(20, 20)
    img.tintColor = new Color(levelLabel[forecast.nextLow.levelScore].tint)

    const cleanStack = low.addStack()
    const d = forecast.nextLow.start
    const df = new DateFormatter()
    df.dateFormat = 'E dd à HH'
    df.locale = LOCALE

    const date = cleanStack.addText(`${df.string(d)} h`)
    date.font = Font.lightSystemFont(16)
  }

  global.addSpacer()

  // Bottom Row
  const bottomRow = global.addStack()
  bottomRow.layoutHorizontally()

  // Hourly Forecast
  const hourFormatter = new DateFormatter()
  hourFormatter.dateFormat = 'HH'
  for ([i, f] of forecast.soon.entries()) {
    if (i !== 0) {
      bottomRow.addSpacer()
    }
    const hourlyStack = bottomRow.addStack()
    hourlyStack.layoutVertically()

    // Hour
    const hour = hourlyStack.addStack()
    hour.addSpacer()
    const text = hour.addText(`${hourFormatter.string(f.start)} h`)
    text.font = Font.lightSystemFont(12)
    hour.addSpacer()

    hourlyStack.addSpacer()

    // Image
    const imgStack = hourlyStack.addStack()
    imgStack.addSpacer()
    const symbol = createSymbol(levelLabel[f.levelScore], 28)
    const img = imgStack.addImage(symbol)
    img.imageSize = new Size(25, 25)
    img.tintColor = new Color(levelLabel[f.levelScore].tint)
    imgStack.addSpacer()

    hourlyStack.addSpacer()

    // Carbon Intensity
    const lvlStack = hourlyStack.addStack()
    lvlStack.layoutHorizontally()
    lvlStack.addSpacer()
    const lvl = lvlStack.addText(`${f.carbonIntensity} g`)
    lvl.font = Font.lightSystemFont(10)
    lvlStack.addSpacer()
  }

  widget.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 10) // 10 min

  setColours(widget)

  return widget
}

function createSymbol (symbol, fontSize) {
  const s = SFSymbol.named(symbol.symbol)
  s.applyFont(Font.systemFont(fontSize))

  return s.image
}

// Todo: nicer colours
const colours = {
  startColour: 'ffffff',
  endColour: 'ffffff',
  darkStartColour: '0050ca',
  darkEndColour: '648dc9'
}

const startColour = Color.dynamic(new Color(colours.startColour), new Color(colours.darkStartColour))
const endColour = Color.dynamic(new Color(colours.endColour), new Color(colours.darkEndColour))

function setColours (widget) {
  const gradient = new LinearGradient()
  gradient.colors = [startColour, endColour]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient
}

// Script starts

if (!API_TOKEN) {
  throw 'missing API key'
}

const apiResponse = await getForecastFromAPI(args.widgetParameter)
const forecast = handleAPIResponse(apiResponse)
const widget = createWidget(forecast)

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}

Script.complete()

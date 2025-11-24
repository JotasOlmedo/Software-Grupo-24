const notificationService = require("../services/notificationService")

const STOCK_CHECK_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

let stockCheckInterval = null

function startStockMonitoring() {
  console.log("Starting stock monitoring service...")

  notificationService
    .checkStockLevels()
    .then((alerts) => {
      if (alerts.length > 0) {
        console.log(`Initial stock check: ${alerts.length} alerts sent`)
      } else {
        console.log("Initial stock check: All stock levels OK")
      }
    })
    .catch((err) => {
      console.error("Error in initial stock check:", err)
    })

  stockCheckInterval = setInterval(() => {
    console.log("Running periodic stock check...")
    notificationService
      .checkStockLevels()
      .then((alerts) => {
        if (alerts.length > 0) {
          console.log(`Periodic stock check: ${alerts.length} alerts sent`)
        } else {
          console.log("Periodic stock check: All stock levels OK")
        }
      })
      .catch((err) => {
        console.error("Error in periodic stock check:", err)
      })
  }, STOCK_CHECK_INTERVAL)
}

function stopStockMonitoring() {
  if (stockCheckInterval) {
    clearInterval(stockCheckInterval)
    stockCheckInterval = null
    console.log("Stock monitoring service stopped")
  }
}

module.exports = {
  startStockMonitoring,
  stopStockMonitoring,
}

function logger(severity: string, initiator: string, category: string, text: string) {

  let color = null;

  if (initiator === "core") color = "gray"

  if (category === "starting") color = "green"
  if (category === "finished") color = "yellow"
  if (severity === "error" || category === "stderr") color = "red"

  if (color !== null) {
    console.log(`%c[${new Date().toLocaleString()}][${initiator}][${category}] ${text}`,`color: ${color}`)
  } else {
    console.log(`[${new Date().toLocaleString()}][${initiator}][${category}] ${text}`)
  }

}

export { logger }

import fs from 'fs'

export const writeLog = (data: any) => {
    console.log(data)
    const cleanData = JSON.stringify(data)
    console.log(cleanData)
    fs.writeFile("input.json", cleanData, (error) =>{
        if(error) throw error
        console.log("->>>>>>>>>>>>>>> success write")
    })
}


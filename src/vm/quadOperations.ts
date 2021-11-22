import { write } from "fs"
import {writeLog} from "../renderLogger"

export const sum = (lhs: number, rhs: number) => {
  return lhs + rhs
}

export const subtraction = (lhs: number, rhs: number) => {
  return lhs - rhs
}

export const multiply = (lhs: number, rhs: number) => {
  return lhs * rhs
}

export const divide = (lhs: number, rhs: number) => {
  return lhs / rhs
}

export const greaterThan = (lhs: number, rhs: number) => {
  return lhs > rhs
}

export const lessThan = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs < rhs
}

// ==
export const isEqual = (lhs: any, rhs: any) => {
  return lhs == rhs
}

// =
export const equals = (lhs: any, res: any) => {}

export const notEqual = (lhs: any, rhs: any) => {
  return lhs != rhs
}

export const greaterOrEqual = (lhs: number, rhs: number) => {
  return lhs >= rhs
}

export const lessOrEqual = (lhs: number, rhs: number) => {
  return lhs <= rhs
}

export const andExp = (lhs: boolean, rhs: boolean) => {
  return lhs && rhs
}

export const orExp = (lhs: boolean, rhs: boolean) => {
  return lhs || rhs
}

type Tag = {
  name?: string,
  config?: any
  props?: {
    children: any
  }
  children?: any
  className?: any,
  dom?: any,
  text?: any
}
let tags: [Tag] = [{}]
tags.shift()
let currentTag: Tag = {}
let temporalTag: Tag = {}
const setCurrentTag = (current: Tag) => {
  currentTag = current
}
const getRealHeadingTag = (tag: any) => {
  switch (tag) {
    case 1:
      return 'h1'
    case 2:
      return 'h2'
    case 3:
      return 'h3'
    case 4:
      return 'h4'
    case 5:
      return 'h5'
    case 6:
      return 'h6'
    default:
      return 'h1'
  }
}

export const doRenderLog = () => {
  writeLog(tags)
}

export const buildRenderStruct = (tag: number, args: any, something: any) => {
  console.log(tag, args, something)
  args = JSON.parse(args)
  switch (tag) {
    case 1:
      console.log("container")
      console.log(args, something)
      if(args === -1 && something == -1){
          currentTag = {
          name: 'div',
          className: 'container'
        }
        setCurrentTag(currentTag)
      }
      
      break;
    case 2:
      console.log("paragraph")
      tags.push({
        name: 'p',
        text: args,
        config: {}
      })
      break;
    case 3:
      console.log("heading")
      const cn = "title is-"+args
      console.log(cn)
      if(something === "text"){
        const n = { ...temporalTag,
          text: args,
          config: {
            className: cn
          },
        }
        temporalTag = n
      }else{
        const realTag = getRealHeadingTag(args)
        const n = { ...temporalTag,
          name: realTag,
          config: {
            className: cn
          },
        }
        temporalTag = n
      }
      if(temporalTag.name && temporalTag.text){
        tags.push(temporalTag)
        temporalTag = {}
      }
      break;
    case 4:
      console.log("table")
      break;
    case 5:
      console.log("image")
      if(something === "source"){
        tags.push({
          name: 'figure',
          config: {
            className: 'image is-128x128'
          },
          children: {
              tag: 'img',
              config: {
                style : {
                  src: args
                },
                props: {}
              }
            },
          text: ''
        })
      } 
      break;
    case 6:
      console.log("card")
      break;
    case 7:
      console.log("layout")
      break;
  
    default:
      break;
  }
  
}

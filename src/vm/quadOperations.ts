import { write } from "fs"
import { Stack } from "mnemonist"
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
  props?: any
  children?: any
  className?: any,
  dom?: any,
  text?: any,
  style?: any
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

export const addCurrentArgs = (params: any) => {
  currentTag = {...currentTag,style: {...currentTag.style,...params}
  }
}

let mainStack: Stack<any>
let currentStack: Stack<any>
let hasParent: boolean = false

export const buildRenderStruct = (tag: number, args: any, something: any) => {
  args = JSON.parse(args)
  switch (tag) {
    case 1:
      console.log("container")
      console.log(args, something)
      hasParent = true
      if(args === -2 && something === -2){
        hasParent = false
        console.log("WE ARE OUT >>>>>>")
        tags.push(currentTag)
        currentTag = {}
      }
      if(args === -1 && something == -1){
          currentTag = {
          name: 'div',
          config: {
            className: 'container',
          },
          text: "",
          children: []
        }
        setCurrentTag(currentTag)
      }else{
        addCurrentArgs({[something]: args})
      }
      console.log(currentTag)
      break;
    case 2:
      console.log("paragraph")
      const child = {
        name: 'p',
        text: args,
        config: {
          style: {},
          className: 'hello',
        },
        children: []
      }
      
      if(hasParent){
        currentTag.children.push(child)
      }else{
        tags.push(child)
      }
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
        if(hasParent){
          currentTag.children.push(temporalTag)
        }else{
          tags.push(temporalTag)
        }
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
          name: 'img',
          config: {
            style: {
              src: args,
            },
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

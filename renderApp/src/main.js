import { verify } from "crypto";
import j from "../../input.json"
document.body.style.height = '100vh'
document.body.style.background = '#DEDEDE'
const data = j
console.log(data)

function createVElement(tag, config, children = null) {
  const { className, style } = config;

  return {
    tag: tag,
    style: style,
    props: {
      children: children,
    },
    className: className,
    dom: null,
  }
}



function mount(input, parentDOMNode) {
  //Hmmm lets see what input is. 
  if (typeof input === 'string' || typeof input === 'number') {
    //we have a vText
    mountVText(input, parentDOMNode);
  } else {
    //we have a vElement
    mountVElement(input, parentDOMNode)
  }
}

function mountVText(vText, parentDOMNode) {
  // Oeeh we received a vText with it's associated parentDOMNode.
  // we can set it's textContent to the vText value. 
  // https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
  parentDOMNode.textContent = vText;
}

function mountVElement(vElement, parentDOMNode) {
  const { className, tag, props, style } = vElement;

  const domNode = document.createElement(tag);
  vElement.dom = domNode;
  if(props){

    if (props.children) {
       // Oeh, we have children. Pass it back to our mount
     // function and let it determine what type it is.
       props.children.forEach(child => mount(child, domNode));
    }
  }

  if (className !== undefined) {
    domNode.className = className;
  }

  if (style !== undefined) {
    Object.keys(style).forEach(sKey => domNode.style[sKey] = style[sKey]);
  }
  if(vElement.tag === "img"){
    vElement.dom.src = vElement.style.src
    vElement.dom.width = 200
    vElement.dom.height = 200
  }

  parentDOMNode.appendChild(domNode);

  return domNode;
}

const root = document.body
const myApp = createVElement('div', { className: 'my-class' }, 
  data.map((element) => {
    if(element.children){
      return createVElement(element.name, element.config, element.children.map((child) => {
        return createVElement(child.name, child.config, [child.text])
      }))
    }else{
      return createVElement(element.name, element.config, [element.text])
    }
  })
);
mountVElement(myApp, root)






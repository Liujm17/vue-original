//初始值更新 每当数据更新时候会通知相关指令更新


//watcher作用:把每个node节点和相关数据绑定
//收集dom依赖，也就是data和哪些dom有关联
class Watcher {
    constructor(key,vm,cb){
       this.key=key;
       this.vm=vm;
       this.cb=cb;
       //通过getter形式对数据进行绑定，标记当前的watcher
       this.oldValue=this.getOldValue()
    }
    getOldValue(){
        //构造函数上的静态变量
        Dep.target=this;
        const oldValue=utils.getValue(this.key,this.vm);
        Dep.target=null;
        return oldValue
    }
    update(){
        const newValue = utils.getValue(this.key,this.vm)
        if(newValue !== this.oldValue){
            //回调函数
            this.cb(newValue)
        }
    }
}

//一个数据跟多个watcher进行绑定
class Dep {
    constructor(){
        this.collect=[]
    }
    addWatcher(watcher){
        this.collect.push(watcher)
    }
    notify(){
        this.collect.forEach(w=>w.update())
    }
}




//处理模版部分，将模版中使用的data部分的变量和模版绑定起来(编译模版)
//this.$el为模版，this本为this.$data为数据，但是为了更多操作传this，也能获取this.$data
class Compiler{
    //el为节点，vm为vue实例
    constructor(el,vm){
        //isElementNode判断方法，判断el是不是一个dom选择器选择的节点，否则返回document.querySelector来选择el节点成为dom节点
       this.el=this.isElementNode(el)?el:document.querySelector(el)
       this.vm=vm  //这时候已经有id为app的节点，接下来开始把dom节点和数据绑定
       //使用文档片段方法处理dom，和原生dom处理一样，好处比较多，把原生的dom下的节点全部插入到了fragment中，然后就可以去编译处理，绑定数据到指定地点，再返回到el上渲染
       const fragment =  this.compileFragment(this.el)
       //处理编译文档片段，使他可以对应绑定数据
       this.compile(fragment)
       //再向el的dom元素注入绑定数据后的片段
       this.el.appendChild(fragment)
    }
    //判断方法是否为标签节点
    isElementNode(el){
        //el自带的值nodeType,当为1的时候为dom选择器的节点
        return el.nodeType === 1;
    }
    //判断方法是否为文本节点
    isTextNode(el){
        return el.nodeType === 3
    }
    //文档片段，(不会触发ui的更新，保证性能)
    compileFragment(el){ //el为选择器,dom节点对象
        //document文档片段方法
        const f =document.createDocumentFragment()
        let firstChild;
        //firstChild为dom下的子元素，也就是#app的子元素
        while(firstChild = el.firstChild){
            //appendChild插入一个firstChild后会把第一把删掉，那就是第二个就是第一个子元素了，用while循环就可以全部插入到文档片段中
           f.appendChild(firstChild)
        }
        //通过el选择器选择dom节点，把节点下的子元素全部插入到了f中
        //全部的#app的子元素
        return f
    }
    //处理编译模版，对应绑定$data上的数据
    compile(fragment){
        //获取文档片段所有子元素，fragment.childNodes为类数组，把它变成数组的话后续方便自己处理它
        const childNodes = Array.from(fragment.childNodes)
        childNodes.forEach(childNode=>{
            //这里发现，换行展示的节点会有text标签，怎么去去除它，它的childNode.nodeType==3 而原本的子节点childNode.nodeType==1
            //this.isElementNode(childNode)==true也就是his.isElementNode(childNode)==1
            if(this.isElementNode(childNode)){
                //标签节点h1/input等，读取属性。查看是否有v-开头的内容
                this.compileElement(childNode) //处理标签节点获取对应想要的绑定的数据，然后到$data对应渲染
            }else if(this.isTextNode(childNode)){
                //文本节点 {{msg}} 是否有双括号语法
                this.compileText(childNode)//处理文本节点获取对应想要的绑定的数据，然后到$data对应渲染
            }
            //childNode有子节点的话，递归处理 
            if(childNode.childNodes &&childNode.childNodes.length){
                  this.compile(childNode)
            }
        })
    }
    //处理标签节点获取对应想要的绑定的数据，然后到$data对应渲染
    compileElement(node){
          //node.attributes为节点下的所有属性，类数组，处理的话要转成数组
        const attributes =Array.from(node.attributes)
        //v-model,v-text,v-on:click
        attributes.forEach(attr=>{
            //获取属性名和值，比如<input type="text" v-model='msg'>，name为type和v-model，值为text和msg
            const {name,value} = attr
            //判断他为指令,不同指令不用的方法去绑定value值
            if(this.isDirector(name)){
                //获取v-指令后的属性，v-model，v-text，v-bind
               const [,directive] = name.split('-')//字符串以-截断，directive为第二段
               //v-on:click得二次截断，后面为事件 
               const [compileKey,eventName] = directive.split(':')
               //在不同指令方法集中对应使用
               utils[compileKey](node,value,this.vm,eventName)
            }
        })
    }
    isDirector(name){
        //es6语法中的判断是否以v-开头
        return name.startsWith('v-')
    }
    //处理文本节点获取对应想要的绑定的数据，然后到$data对应渲染
    compileText(node){
         //{{msg}}
         //把双括号内的内容拿出来
         const content =node.textContent;
         if(/\{\{(.+)\}\}/.test(content)){
            //文本节点和v-text一致
             utils['text'](node,content,this.vm)
         }
    }
}

//不同指令处理绑定数据的方法
const utils={
    //获取$data里的数据
    getValue(key,vm){
        //trim去空格
        return vm.$data[key.trim()]
    },
    //将$data里的数据设置到获取下来的文档片段上
    setValue(key,vm,newValue){
       vm.$data[key]=newValue
    },
    //v-model指令方法
    model(node,value,vm){
        //通过getValue方法从data中对应获取值,初始值，会触发observe里的get函数
      const initValue = this.getValue(value,vm)
      new Watcher(value,vm,(newValue)=>{
          //初始化更新一次
        this.modelUpdater(node,newValue)

    })
      //数据绑定
      node.addEventListener('input',(e)=>{
          const newValue = e.target.value;
          //设置数据
          this.setValue(value,vm,newValue)
      })
      //回调更新一次
      this.modelUpdater(node,initValue)
    },
    //v-text指令
    text(node,value,vm){
        let result;
       if(value.includes('{{')){
           ///{{xxx}}
           result = value.replace(/\{\{(.+)\}\}/g,(...args)=>{
              const key=args[1].trim()
              new Watcher(key,vm,(newValue)=>{
                  this.textUpdater(node,newValue)

              })
               return this.getValue(args[1],vm)
           })
       }else{
           ///v-text='xxx
           result = this.getValue(value,vm)
       }
       //文本更新到节点上
       this.textUpdater(node,result)
    },
    on(node,value,vm,eventName){

    },
    //本文节点更新
    textUpdater(node,value){
        node.textContent=value
    },
    modelUpdater(node,value){
        node.value=value
    }
}


//触发this.$data.xx和模版的绑定
class Observer {
    constructor(data) {
        this.observe(data)
    }
    observe(data) {
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineRective(data, key, data[key])
            })
        }
    }
    defineRective(obj, key, value) {
        //递归观察每项值，因为有可能值为几层对象
        this.observe(value)
        //
        const dep =new Dep()
        Object.defineProperty(obj, key, {
            get() {
                //
                const target = Dep.target
                target && dep.addWatcher(target)
                return value
            },
            //因为this.observe()用到了this，set为函数，为保持它与上层this一致用箭头函数
            set: (newVal) => {
                //value为原值，如果新的值和原值相等，那就直接下一步
                if (value === newVal) return;
                //因为新值也可能是几层对象，所以递归set，
                this.observe(newVal)
                //先赋值再dep.notify()通知更新
                value = newVal
                 //使用dep中的notify通知对应watcher更新
                 dep.notify()
            }
        })
    }
}


class Vue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options

        //触发this.$data.xx和模版的绑定
        new Observer(this.$data)

        //处理模版部分，将模版中使用的data部分的变量和模版绑定起来
        //this.$el为模版，this本为this.$data为数据，但是为了更多操作传this，也能获取this.$data
        new Compiler(this.$el, this)

        //处理$data数据
        this.proxyData(this.$data)
    }
    //这个方法是把this.$data上的值挂载到this上，可以通过this.xx改变this.$data.xx的值
    proxyData(data) {
        Object.keys(data).forEach((key) => {
            //把this.$data上的属性全部挂载到this上，这样直接通过this去获取属性
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newValue) {
                    data[key] = newValue
                }
            })
        })
    }
}






//整体过一下，同步
//1.0里，
//1.所有$data里的结果转化到vue实例的this上去，后续this.xx就可以获取
//2.对于$data里的数据，要把所有数据都进行一个observe函数，对每个数据都进行劫持和处理
//3.收集数据dom依赖,所以定义每次getter的时候实例化dep对象，它的作用主要是收集watcher，也就是收集它的依赖
//怎么收集依赖(模版编译部分)

//watcher 每当实例化一个watcher就会触发一个getOldvalue，也就是读取旧的值和它的依赖，然后再通过setter去更新

//v-model 通过实例化watcher来更新model的值，其次通过监听input事件，获取新的值后通过setValue来更新值
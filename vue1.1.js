//对this.$data的属性做了处理，也就是劫持和获取了this.$data的属性


class Observer{
    constructor(data){
        this.observe(data)
    }
    observe(data){
        if(data&&typeof data === 'object'){
            Object.keys(data).forEach(key=>{
                this.defineRective(data,key,data[key])
            })
        }
    }
    defineRective(obj,key,value){
        //递归观察每项值，因为有可能值为几层对象
        this.observe(value)
        Object.defineProperty(obj,key,{
            get(){
                console.log('get:',key,value)
                return value
            },
            //因为this.observe()用到了this，set为函数，为保持它与上层this一致用箭头函数
            set:(newVal)=>{
                //value为原值，如果新的值和原值相等，那就直接下一步
               if(newVal === value) return
               console.log('set:',key,newVal)
               //因为新值也可能是几层对象，所以递归set，
               this.observe(newVal)
               value=newVal
            }
        })
    }
}


class Vue{
    constructor(options){
        this.$el=options.el;
        this.$data=options.data;
        this.$options=options
         
        //触发this.$data.xx和模版的绑定
        new Observer(this.$data)

        this.proxyData(this.$data)
    }
    //z这个方法是把this.$data上的值挂载到this上，可以通过this.xx改变this.$data.xx的值
    proxyData(data){
        Object.keys(data).forEach((key)=>{
            //把this.$data上的属性全部挂载到this上，这样直接通过this去获取属性
           Object.defineProperty(this,key,{
            get () {
                return data[key]
              },
              set (newValue) {
                 data[key]=newValue
              }
           })
        })
    }
}
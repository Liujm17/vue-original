//vue2.0 patch和vNode,
//不再处理dom，而是处理虚拟节点virtual dom，通过js对象的对比来决定更新内容，来实现优化
//patch和diff算法
//vNode理解:对象来描述node节点，patch方法，每次patch的时候对比两个vd来判断更新了哪些 
//vNode减少了dom的操作 vnode可以跨平台 测试容易
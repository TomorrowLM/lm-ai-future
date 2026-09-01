import gc

# 直接引用和间接引用
name = 1;
l = [2, 3, name];
print(id(name));
print(id(l[2]));

# 循环引用之内存泄漏问题
a=[1,2];
b=[3,4];
a.append(b);
b.append(a);
a_id = id(a)
b_id = id(b)
del a; # 删除当前作用域中的变量名 a，解除变量 a 对对象的直接引用，但对象仍然存在
# print(a)       # 报错，a 不存在
print(b)       # 可以打印，b 仍然存在
print(b[2])    # 可以访问原来的 a 对象
del b;
# 此时 a 和 b 都被删除，但循环引用的对象仍然存在，等待垃圾回收器回收
# print(b)  # 报错，b 不存在

# 通过 gc.get_objects() 查看对象是否仍被垃圾回收器跟踪
# any(id(obj) == a_id for obj in gc.get_objects())等价于：
# for obj in gc.get_objects():
#     if id(obj) == a_id:
#         found = True
#         break

print(any(id(obj) == a_id for obj in gc.get_objects()))
print(any(id(obj) == b_id for obj in gc.get_objects()))

count = gc.collect()
print(count)

print(any(id(obj) == a_id for obj in gc.get_objects()))
print(any(id(obj) == b_id for obj in gc.get_objects()))
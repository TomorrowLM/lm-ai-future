#pip install numpy
from numpy import dot
from numpy.linalg import norm

from core.embedding import GLMEmbeddings

embeddings_model = GLMEmbeddings()


# 计算余弦相似度，参考文章：https://blog.csdn.net/Hyman_Qiu/article/details/137743190
#定义一个函数 cosine_similarity，该函数接受两个向量 vec1 和 vec2 作为输入。
def cosine_similarity(vec1, vec2):
    #计算并返回两个向量之间的余弦相似度，公式为：两个向量的点积除以它们范数的乘积。
    return dot(vec1, vec2) / (norm(vec1) * norm(vec2))

# 实现文本搜索功能
# 定义一个函数 search_documents，该函数接受一个查询字符串 query 和一个文档列表 documents 作为输入。
def search_documents(query, documents):
    # 使用相同模型生成查询和文档向量，才能比较它们的相似度。
    query_embedding = embeddings_model.embed_query(query)
    document_embeddings = embeddings_model.embed_documents(documents)
    # 计算查询嵌入向量与每个文档嵌入向量之间的余弦相似度，存储在 similarities 列表中
    similarities = [cosine_similarity(query_embedding, doc_embedding) for doc_embedding in document_embeddings]
    # 找到相似度最高的文档的索引 most_similar_index。
    most_similar_index = similarities.index(max(similarities))
    # 返回相似度最高的文档和相似度得分。
    return documents[most_similar_index], max(similarities)


# 测试文本搜索功能
if __name__ == "__main__":
    documents = [
        "OpenAI的ChatGPT是一个强大的语言模型。",
        "天空是蓝色的,阳光灿烂。",
        "人工智能正在改变世界。",
        "Python是一种流行的编程语言。"
    ]
    #".././resource/knowledge.txt" 文件内容，转换为上述documents
    #documents = [line.strip() for line in open(".././resource/knowledge.txt", "r", encoding="utf-8")]

    query = "人工智能"

    most_similar_document, similarity_score = search_documents(query, documents)
    print(f"最相似的文档: {most_similar_document}")
    print(f"相似性得分: {similarity_score}")

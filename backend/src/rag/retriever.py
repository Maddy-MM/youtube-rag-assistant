def get_retriever(vector_store):
    # MMR reduces redundant chunks — fetch_k is candidate pool, k is final count passed to LLM
    # lambda_mult=0.7 leans towards relevance while still enforcing diversity
    return vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "fetch_k": 20,
            "lambda_mult": 0.7,
        }
    )
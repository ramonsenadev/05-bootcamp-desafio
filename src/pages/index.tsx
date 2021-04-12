import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { GetStaticProps } from 'next';

import { FiUser, FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  const handleLoadMorePosts = (): void => {
    const { next_page } = postsPagination;

    fetch(next_page)
      .then(response => response.json())
      .then(({ results: newPosts, next_page: newNextPage }) => {
        setPosts([...posts, ...newPosts]);
        setNextPage(newNextPage);
      });
  };

  return (
    <>
      <Head>
        <title>Início | spacetraveling.</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={commonStyles.contentContainer}>
          <div className={styles.postContainer}>
            {posts.map(post => (
              <Link key={post.uid} href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div className={styles.postFooter}>
                    <div className={styles.postDate}>
                      <FiCalendar size="20" />
                      <time>{post.first_publication_date}</time>
                    </div>
                    <div className={styles.postAuthor}>
                      <FiUser size="20" />
                      <span>{post.data.author}</span>
                    </div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
          {nextPage && (
            <button
              type="button"
              className={styles.carregarMaisPosts}
              onClick={handleLoadMorePosts}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const postsPagination = {
    results: postsResponse.results.map(post => ({
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'd MMM Y',
        {
          locale: ptBR,
        }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    })),
    next_page: postsResponse.next_page,
  };

  return {
    props: {
      postsPagination,
    },
  };
};

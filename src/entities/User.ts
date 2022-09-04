// import { Entity, PrimaryKey, Column } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BaseEntity, OneToMany } from "typeorm";
import { Post } from "./Post";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Field()
  @Column({ unique: true })
  nick_name!: string;

  @Column()
  password!: string;

  @Field()
  @Column({ unique: true })
  email!: string;
    
  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;
  
  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
